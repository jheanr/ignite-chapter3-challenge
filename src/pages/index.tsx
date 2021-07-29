import { useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from 'react-icons/fi';

import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<PostPagination>(postsPagination);

  function handleLoadMorePosts(nextPage: string): void {
    fetch(nextPage)
      .then(response => response.json())
      .then(data => {
        const { next_page } = data;

        const results = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        const updatedPosts = {
          next_page,
          results: [...posts.results, ...results],
        };

        setPosts(updatedPosts);
      });
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <div className={commonStyles.container}>
        <Header />

        <div className={styles.posts}>
          {posts.results.map(post => (
            <div className={styles.post} key={post.uid}>
              <h2 className={styles.postTitle}>
                <Link href={`/post/${post.uid}`}>
                  <a>{post.data.title}</a>
                </Link>
              </h2>

              <p className={styles.postSubtitle}>{post.data.subtitle}</p>

              <div className={styles.postInfo}>
                <span>
                  <FiCalendar />{' '}
                  {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </span>

                <span>
                  <FiUser /> {post.data.author}
                </span>
              </div>
            </div>
          ))}
        </div>

        {posts.next_page && (
          <button
            type="button"
            className={styles.loadMorePostsButton}
            onClick={() => handleLoadMorePosts(posts.next_page)}
          >
            Carregar mais posts
          </button>
        )}
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
      },
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
